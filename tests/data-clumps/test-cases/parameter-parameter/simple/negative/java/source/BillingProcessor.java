public class BillingProcessor {
    public void createInvoice(int patientId, int doctorId, double invoiceAmount) {
        System.out.println("Creating invoice of " + invoiceAmount + " for patient " + patientId + " with doctor " + doctorId);
    }
}
