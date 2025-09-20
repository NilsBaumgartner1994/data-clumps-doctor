public class Patient {
    public Address address;
    public ContactInfo contactInfo;
    public EmergencyContact emergencyContact;
    public String patientId;

    public Patient(Address address, ContactInfo contactInfo, EmergencyContact emergencyContact, String patientId) {
        this.address = address;
        this.contactInfo = contactInfo;
        this.emergencyContact = emergencyContact;
        this.patientId = patientId;
    }
}
