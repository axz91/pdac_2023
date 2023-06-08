
// PDAC2023/mirna_m_pdac.html lines 5967-6001


function addSaveButtonElement(view_obj, text, type) {
    // create a save button element for the save dropdown
    var saveButton = document.createElement("a");
    saveButton.setAttribute("href", "#");
    saveButton.innerText = text;
    saveButton.onclick = function() {
      view_obj.toImageURL(type, scaleFactor=3).then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'vega-export.' + type);
  
        var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
                     navigator.userAgent &&
                     navigator.userAgent.indexOf('CriOS') == -1 &&
                     navigator.userAgent.indexOf('FxiOS') == -1;
                     
        // Display a base64 URL inside an iframe in another window.
        function debugBase64(base64URL){
            var win = window.open();
            win.document.write('<iframe src="' + base64URL  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
        }             
                        
        if (isSafari){
            debugBase64(link.href);
        } else {
            link.dispatchEvent(new MouseEvent('click'));
        }
    
    
        });
        };
    return saveButton;
  }