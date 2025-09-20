package doctor;

class Doctor {
  public String firstname;
  public String lastname;
  public Address address; // this Address is different from Patient's Address

    public Doctor(String firstname, String lastname, Address address) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.address = address;
    }
}