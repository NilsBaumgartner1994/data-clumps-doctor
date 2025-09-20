public class Patient {
    public int recordId;
    public boolean isActive;
    public int visitCount;

    public Patient(int recordId, boolean isActive, int visitCount) {
        this.recordId = recordId;
        this.isActive = isActive;
        this.visitCount = visitCount;
    }
}
