/**
 * src/lib/integrations/keypay/client.ts
 *
 * ============================================================
 * KeyPay API Client
 * ============================================================
 * Handles API communication with KeyPay/Employment Hero.
 * Manages token refresh, employee records, and timesheet push.
 */

export interface KeyPayConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  partnerId?: string;
}

export interface KeyPayEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  externalId?: string;
}

export interface KeyPayPayslipInput {
  employeeId: string;
  startDate: string;
  endDate: string;
  regularHours: number;
  overtimeHours: number;
  leaveHours: number;
  totalHours: number;
  notes?: string;
}

/**
 * KeyPay API client for Employment Hero integration.
 * Docs: https://developer.yourpayroll.io/
 */
export class KeyPayClient {
  private config: KeyPayConfig;
  private baseUrl = "https://api.yourpayroll.io";

  constructor(config: KeyPayConfig) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL for user to grant permissions.
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "payroll:write employees:read timesheets:write",
      state,
    });

    return `https://api.yourpayroll.io/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token.
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    partnerId: string;
  }> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `KeyPay token exchange failed: ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      partner_id: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      partnerId: data.partner_id,
    };
  }

  /**
   * Refresh access token if expired.
   */
  async refreshAccessToken(): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (!this.config.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`KeyPay token refresh failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.config.accessToken = data.access_token;
    this.config.expiresAt = Date.now() + data.expires_in * 1000;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get list of employees from KeyPay.
   */
  async getEmployees(): Promise<KeyPayEmployee[]> {
    await this.ensureValidToken();

    const response = await fetch(`${this.baseUrl}/v2/employees`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`KeyPay get employees failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: KeyPayEmployee[] };
    return data.data || [];
  }

  /**
   * Push timesheet data to KeyPay for an employee.
   * Creates or updates payslip in KeyPay.
   */
  async pushTimesheet(input: KeyPayPayslipInput): Promise<{
    id: string;
    status: string;
  }> {
    await this.ensureValidToken();

    const response = await fetch(
      `${this.baseUrl}/v2/employees/${input.employeeId}/payslips`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          startDate: input.startDate,
          endDate: input.endDate,
          regularHours: input.regularHours,
          overtimeHours: input.overtimeHours,
          leaveHours: input.leaveHours,
          totalHours: input.totalHours,
          notes: input.notes,
          source: "wattleos",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`KeyPay push timesheet failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { id: string; status: string };
    return data;
  }

  /**
   * Get all payslips for an employee in a date range.
   */
  async getPayslips(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ id: string; startDate: string; endDate: string }>> {
    await this.ensureValidToken();

    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    const response = await fetch(
      `${this.baseUrl}/v2/employees/${employeeId}/payslips?${params}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`KeyPay get payslips failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ id: string; startDate: string; endDate: string }>;
    };
    return data.data || [];
  }

  // ──────────────────────────────────────────────────────────

  /**
   * Ensure access token is still valid. Refresh if needed.
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.config.accessToken) {
      throw new Error("No access token configured");
    }

    // If token expires in less than 5 minutes, refresh it
    if (this.config.expiresAt && Date.now() > this.config.expiresAt - 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Get authorization headers for API requests.
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.accessToken}`,
      "X-Partner-Id": this.config.partnerId || "",
    };
  }
}

export default KeyPayClient;
