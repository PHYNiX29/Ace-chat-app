const headingStatus = document.querySelector(".selected-status");
const querySection = document.querySelector(".all-queries");
const noQuery = document.querySelector(".null");

async function dataFetch(){
    const response = await fetch("./allData");
    const result = await response.json();
    // console.log(result.data.portals.length);
    // let cache;
    // console.log(cache===result);
    // if(cache !== result){
    //     cache = result;
    //     console.log(cache===result);
    if(!result.data.portals.length){
        noQuery.classList.remove("hidden");
    }else{
        const chatArr = result.data.portals;
        displayData(chatArr);
    }
        
    // }
}

function displayData(arr){
    arr.forEach(element => {
        // if(element.queryStatus === "pending"){
            const div = document.createElement("div");
            div.textContent =element.querySubject;
            div.classList.add("query");
            div.id=element.querierId;
            eventFetch(div);
            querySection.append(div);
        // }
    });
}

function eventFetch(el){
    el.addEventListener("click",async()=>{
        const request = await fetch("/queryId",{
            method:"POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id:el.id})    
            // body: JSON.stringify({ id:"sdsfsfddasf"})        
        });
        const result = await request.json();
        if(result.redirect === "/chat"){
            window.location.href="/chat";
        }
    })
}



// setInterval(dataFetch,5000);

dataFetch();

