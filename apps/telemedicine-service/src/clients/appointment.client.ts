import { env } from "../config/env.js";
import type { AppointmentSummary } from "../shared/contracts/index.js";
import { HttpError } from "../shared/http/error-handler.js";
import { ServiceClient } from "../shared/http/service-client.js";

export class AppointmentService {
  private readonly client: ServiceClient;

  constructor() {
    this.client = new ServiceClient(env.services.appointment);
  }

  async ensureAppointmentExists(appointmentId: string): Promise<void> {
    const result = await this.client.get<AppointmentSummary>(
      `/api/appointments/${appointmentId}`,
    );

    if (!result.ok || !result.data) {
      throw new HttpError(400, "Invalid appointmentId");
    }
  }
}

export const appointmentService = new AppointmentService();
