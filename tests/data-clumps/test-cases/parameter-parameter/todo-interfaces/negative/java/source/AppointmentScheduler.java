public interface AppointmentScheduler {
  void schedule(int patientId, int doctorId, boolean requiresFollowUp);
}
