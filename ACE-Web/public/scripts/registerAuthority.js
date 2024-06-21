const memberForm =  document.querySelector("#memberForm");

const err = document.querySelector(".error-message");
const message = document.querySelector(".message");

memberForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    // const authorityName = document.querySelector("#authorityName").value;
    // const password = document.querySelector("#password").value;

        const response = await fetch("/CreateRoom", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                // authorityName:authorityName,
                // password:password
            }),
        });
    
        const result = await response.json();

        if (result !== null) {
            console.log(result.message);
            if (result.message === undefined) {
                message.textContent = result.err;


                memberForm.reset();
            } else {
                memberForm.reset()
                message.textContent = result.message;

            }
        }
});


