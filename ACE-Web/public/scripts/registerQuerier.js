const memberForm =  document.querySelector("#memberForm");

const err = document.querySelector(".error-message");
const message = document.querySelector(".message");

memberForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    const UID = document.querySelector("#UID").value;

        const response = await fetch("/register/querier", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                UID:UID,
            }),
        });
    
        const result = await response.json();

        if (result !== null) {
            console.log(result.message);
            if (result.message === undefined) {
                message.textContent = result.err;
                setTimeout(()=>{
                    message.textContent ="";
                },3000)

                memberForm.reset();
            } else {
                memberForm.reset()
                message.textContent = result.message;
                setTimeout(()=>{
                    message.textContent ="";
                },3000)
            }
        }
});


