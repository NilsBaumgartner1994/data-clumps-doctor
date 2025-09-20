public class Doctor {
    public Address address;
    public ContactInfo contactInfo;
    public Insurance insurance;
    public String licenseNumber;

    public Doctor(Address address, ContactInfo contactInfo, Insurance insurance, String licenseNumber) {
        this.address = address;
        this.contactInfo = contactInfo;
        this.insurance = insurance;
        this.licenseNumber = licenseNumber;
    }
}
