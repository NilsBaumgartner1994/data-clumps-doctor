public class Patient {
    public Address address;
    public ContactInfo contactInfo;
    public Insurance insurance;
    public String patientId;

    public Patient(Address address, ContactInfo contactInfo, Insurance insurance, String patientId) {
        this.address = address;
        this.contactInfo = contactInfo;
        this.insurance = insurance;
        this.patientId = patientId;
    }
}
