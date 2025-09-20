public class Doctor {
  public String firstname;
  public String lastname;
  public int age;

    public Doctor(String firstname, String lastname, int age) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.age = age;
    }
}

// Another class in the same file. This is allowed in Java, but not common practice. The second class is not allowed to be public.
class Patient {
  public String firstname;
  public String lastname;
  public int age;

    public Patient(String firstname, String lastname, int age) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.age = age;
    }
}