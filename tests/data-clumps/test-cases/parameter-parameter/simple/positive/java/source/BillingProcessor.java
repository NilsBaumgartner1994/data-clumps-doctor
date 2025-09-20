public class BillingProcessor {
    public void createInvoice(int patientId, int doctorId, boolean requiresFollowUp) {
        System.out.println("Creating invoice for patient " + patientId + " and doctor " + doctorId
                + " (requires follow-up: " + requiresFollowUp + ")");
    }
}
