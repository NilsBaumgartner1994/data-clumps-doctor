public interface BillingProcessor {
  void createInvoice(int patientId, int doctorId, boolean requiresFollowUp);
}
