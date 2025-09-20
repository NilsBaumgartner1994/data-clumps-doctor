package patient;

import doctor.Address; // Importing Address from doctor package

public class Patient {
  public String firstname;
  public String lastname;
  public doctor.Address address; // this is the same as Doctor's Address class, because it is imported from doctor package

    public Patient(String firstname, String lastname, doctor.Address address) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.address = address;
    }
}