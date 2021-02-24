// From http://stackoverflow.com/questions/11506510/ajax-file-upload-form-submit-without-jquery-or-iframes

var AjaxFileUploader = function () {
    this._file = null;
    var self = this;

    this.uploadWav = function (uploadUrl, blob, name) {
        var xhr = new XMLHttpRequest();
        xhr.onprogress = function (e) {
            // not implemented
        };

        xhr.onload = function (e) {
            // not implemented
        };

        xhr.onerror = function (e) {
            // not implemented
        };

        xhr.open("post", uploadUrl, true);

        xhr.setRequestHeader("Content-Type", "multipart/form-data");
        xhr.setRequestHeader("X-File-Name", name);
        xhr.setRequestHeader("X-File-Size", blob.size);
        xhr.setRequestHeader("X-File-Type", 'audio/wav');

        xhr.send(blob);
    };
};

AjaxFileUploader.IsAsyncFileUploadSupported = function () {
    return typeof (new XMLHttpRequest().upload) !== 'undefined';
}

/*
if (AjaxFileUploader.IsAsyncFileUploadSupported) {
        ajaxFileUploader = new AjaxFileUploader();

        $("form").submit(function () {
            var uploader = $("#fileUploader")[0];

            if (uploader.files.length == 0) {
                return;
            } else {
                ajaxFileUploader.uploadFile(
                    "http://voicesof.berkeley.edu/add/upload.php",
                    uploader.files[0],
                    name);
            }

            return false;
        });
    }
*/
