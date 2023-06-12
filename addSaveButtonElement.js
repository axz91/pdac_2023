

// PDAC2023/mirna_m_pdac.html lines 2377-2384


{/* <div id="myModal" style="display: none;  position: fixed;  z-index: 1;  left: 0;top: 0;width: 100%;  height: 100%;  overflow: auto; background-color: rgba(0,0,0); background-color: rgba(0,0,0,0.4);">
<div id="modal-content" style="background-color: #fefefe;margin: 15% auto;  padding: 20px;border: 1px solid #888;width: 80%; ">
<span id="close" style="color: #aaa;float: right;font-size: 28px;font-weight: bold; cursor:pointer;">&times;
</span>

<p id=modal-link></p>
</div>
</div> */}


// ===================================================================

// PDAC2023/mirna_m_pdac.html lines 5977-6023

function displayModal(base64URL){ 
    
 
    var modallink = document.getElementById("modal-link");
    modallink.innerHTML = '<a href="'+base64URL+'" download=" '+ base64URL+'">Download Image<a> ';


    var modal = document.getElementById("myModal");
    var span = document.getElementById("close");

    modal.style.display = "block" 
    span.onclick = function() { modal.style.display = "none"; }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function addSaveButtonElement(view_obj, text, type) {
  // create a save button element for the save dropdown
  var saveButton = document.createElement("a");
  saveButton.setAttribute("href", "#");
  saveButton.innerText = text;
  saveButton.onclick = function() {
    view_obj.toImageURL(type, scaleFactor=3).then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'vega-export.' + type);
        
        var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') == -1 &&
        navigator.userAgent.indexOf('FxiOS') == -1;
        
        if (isSafari){
            displayModal(link.href);
        } else {
            link.setAttribute('target', '_blank');
            link.dispatchEvent(new MouseEvent('click'));
        }


    });
  };
  return saveButton;
}

