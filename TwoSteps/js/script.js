//Checks and processes the form
function validate (x) {
    return !x.reportValidity || x.reportValidity();
};


//Math.range
function range (min, x, max) {
    return Math.max(Math.min(x | 0, max), min) | 0;
};

function checkForm(service, secretstring) {

    //List of valid TOTP Secret code patterns
    var pattern = {
        //Base32 Code
        "1": {
            regex: "[A-Za-z2-7]+=*",
            title: "Secret should be Base32 encoded (using only a-z and 2-7)"
        },
        //Raw Hex Code
        "2": {
            regex: "([A-Fa-f0-9]{2})*",
            title: "Hexadecimal only (0-9 and a-f, even number of characters)"
        }
    };

    //TOTP Secret
    //var txt = q("#token");

    //Number of TOTP digits
    //TOTP only supports 6 - 8 digits.
    var num = "6";

    //Secret Code type
    //"1" => (Default) Base32 (a-z, 2-7)
    //"2" => Hexadecimal (a-f, 0-9)
    var sel = "1";

    //IE11 and older has no reportValidity support
    if (validate(secretstring) && validate(num) && validate(sel)) {
        var length = range(6, +num.value, 8);
        var secret = secretstring;
        var current = TOTP.getCurrentCounter(30);

        if (sel === "1") {
            try {
                secret = Convert.base32toHex(secret);
            } catch (e) {
                alert("Invalid Base32 characters");
                return;
            }
        }
        try {
            TOTP.otp(secret, current, length, function (code) {
                //console.log(code)
                displayCode(service, secretstring, code);
            });

        } catch (e) {
            console.error(e);
            alert("Problem decoding Secret.\nVerify your secret and type are correct.\nMessage from decoder: " + e.message);
        };
    }

};
