public interface BillingProcessor {
  void createInvoice(int patientId, int doctorId, double invoiceAmount);
}
