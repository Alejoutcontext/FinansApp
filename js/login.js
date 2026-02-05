const toggle = document.getElementById("togglePassword");
const password = document.getElementById("password");

toggle.addEventListener("click", () => {
  const type = password.type === "password" ? "text" : "password";
  password.type = type;
});
