// Constants
const signUpForm = document.querySelector("form");
const err = document.querySelector("#err");


signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        // const lName = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;
        const username = document.querySelector("#username").value;
        // const role = document.querySelector("#role").value;
        // console.log(role.value);
        // const teamName = document.querySelector("#teamName").value;

        const response = await fetch("/signup", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                // lName,
                password,
                username,
                // role,
                // teamName
            }),
        });

        const result = await response.json();

        if (result !== null) {
            if (result.redirect === undefined) {
                err.textContent = result.err;
                setTimeout(() => {
                    err.textContent = "";
                }, 3000);
                signUpForm.reset();
            } else {
                // Redirect on successful sign-up
                window.location.href = `/${result.redirect}`;
            }
        }
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
});
