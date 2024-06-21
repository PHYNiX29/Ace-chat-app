const userLoginForm =  document.querySelector("#querierLogin");
const userQueryForm =  document.querySelector("#queryForm");

const userLoginDiv =  document.querySelector("#loginFormDiv");
const userQueryDiv =  document.querySelector("#queryFormDiv");

var UID;

userLoginForm.addEventListener("submit", async(e)=>{
    e.preventDefault();

    UID = document.querySelector("#UID").value;

    const response = await fetch("/joinRoom", {
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
        console.log(result);
        if(result.submitQuery === "true"){
            userQueryDiv.classList.remove("hidden");
            userLoginDiv.classList.add("hidden");
        }else if (result.redirect) {
            window.location.href = `/${result.redirect}`;
        }
        else {
            userLoginForm.reset()
            // message.textContent = result.message;
            console.log(result.message);
            setTimeout(()=>{
                message.textContent ="";
            },3000)
        }
    }
});

userQueryForm.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const querySubject = document.querySelector("#title").value;
    const queryMessage = document.querySelector("#queryMessage").value;


    const response = await fetch("/submitQuery", {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({
            UID:UID,
            querySubject:querySubject,
            message:queryMessage,
        }),
    });
    
    const result = await response.json();
    console.log(result);
    if(result!==null){
        if(result.redirect === "temp"){
            window.location.href="/temp"
        }
    }
})


