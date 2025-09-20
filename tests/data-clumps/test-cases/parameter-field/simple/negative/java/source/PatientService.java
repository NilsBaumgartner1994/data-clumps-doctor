public class PatientService {
    public void updateContact(int patientId, boolean isActive, int contactCode) {
        System.out.println(
                "Updating contact details for patient " + patientId + " (active: " + isActive + ") with contact code " + contactCode);
    }
}
