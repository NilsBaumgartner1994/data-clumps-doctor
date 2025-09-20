class Doctor {
  public String firstname;
  public String lastname;
  public int age;

    public Doctor(String firstname, String lastname, int age) {
        this.firstname = firstname;
        this.lastname = lastname;
        this.age = age;
    }

    // define inner class Patient
    public class Patient {
        public String firstname;
        public String lastname;
        public int age;

        public Patient(String firstname, String lastname, int age) {
            this.firstname = firstname;
            this.lastname = lastname;
            this.age = age;
        }
    }
}
