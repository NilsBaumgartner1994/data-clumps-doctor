public class Doctor {
    public int doctorId;
    public boolean isOnCall;
    public int appointmentSlots;

    public Doctor(int doctorId, boolean isOnCall, int appointmentSlots) {
        this.doctorId = doctorId;
        this.isOnCall = isOnCall;
        this.appointmentSlots = appointmentSlots;
    }
}
