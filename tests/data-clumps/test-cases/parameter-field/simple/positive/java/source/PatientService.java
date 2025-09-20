public class PatientService {
    public void registerPatient(int recordId, boolean isActive, int visitCount) {
        System.out.println(
                "Registering patient " + recordId + " with active status " + isActive + " and " + visitCount + " recorded visits");
    }
}
