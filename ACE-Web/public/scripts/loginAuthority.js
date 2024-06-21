const memberForm =  document.querySelector("#memberForm");
console.log(memberForm);
const err = document.querySelector(".error-message");
const message = document.querySelector(".message");

memberForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    const authorityName = document.querySelector("#authorityName").value;
    const password = document.querySelector("#password").value;

        const response = await fetch("/adminLogin", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                authorityName:authorityName,
                password:password
            }),
        });
    
        const result = await response.json();
        console.log(result);
        if(result.redirect === "dashboard"){
            window.location.href="/dashboard"
        }
});


