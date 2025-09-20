package patient;

class Patient {
  public String firstname;
  public String lastname;
  public Address address; // this is different from Doctor's Address

    public Patient(String firstname, String lastname, Address address) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.address = address;
    }
}