public class AppointmentScheduler {
    public void schedule(int patientId, int doctorId, boolean requiresFollowUp) {
        System.out.println("Scheduling appointment for patient " + patientId + " with doctor " + doctorId
                + " (requires follow-up: " + requiresFollowUp + ")");
    }
}
