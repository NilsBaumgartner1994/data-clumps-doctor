public class Patient {
    public int patientId;
    public boolean isActive;
    public int visitCount;

    public Patient(int patientId, boolean isActive, int visitCount) {
        this.patientId = patientId;
        this.isActive = isActive;
        this.visitCount = visitCount;
    }
}
