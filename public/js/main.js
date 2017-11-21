$("document").ready(function() {
    var socket = io.connect();
    var $messageForm = $("#messageForm");
    var $message = $("#message");
    var $chat = $("#chat");
    var $userFormArea = $("#userFormArea");
    var $username = $("#username");
    var $userForm = $("#userForm");
    var $messageArea = $("#messageArea");
    var $users = $("#users");

    $("#chatMessage").mCustomScrollbar({
        theme: "dark-3"
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    $("#btnSpeech").on('click', () => {
        //  console.log("1");
        $("#btnSpeech").addClass("speech");
        recognition.start();
    });

    recognition.addEventListener('result', (e) => {
        let last = e.results.length - 1;
        let text = e.results[last][0].transcript;

        // addYourMessage(text);       
        // socket.emit('chat message', text);
        var data = {
            text: text,
            currentUser: $("#loginUser").text()
        };
        socket.emit("send message", data);
    });

    recognition.addEventListener('speechend', () => {
        //  console.log("4");
        recognition.stop();
    });

    recognition.addEventListener('error', (e) => {
        //  console.log("5");
        $("#btnSpeech").removeClass("speech");
        // outputBot.textContent = 'Error: ' + e.error;
    });

    // var addYourMessage = (text) => {
    //     $('<div class="message message-personal">' + text + '</div>').appendTo($('.mCSB_container')).addClass('new');
    //     updateScrollbar();
    // }


    $messageForm.submit(function(e) {
        e.preventDefault();
        // recognition.start();
        socket.emit("send message", $message.val());
        $message.val('');
    });

    $userForm.submit(function(e) {
        e.preventDefault();
        socket.emit("new user", $username.val(), function(data) {
            // console.log(data);
            if (data.isvalid) {
                //console.log(data.username);
                $("#loginUser").text(data.username);
                $userFormArea.hide();
                $messageArea.show();
            }
        });
        $username.val('');
    });

    function synthVoice(text) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        synth.speak(utterance);
    }

    function updateScrollbar() {
        $("#chatMessage").mCustomScrollbar("scrollTo", "bottom");
    }

    socket.on("new message", function(data) {
        $("#btnSpeech").removeClass("speech");

        // console.log("actual user:" + data.user);
        // console.log("login user:" + $("#loginUser").text());
        var IsCurrentUser = data.user == $("#loginUser").text() ? true : false;
        if (IsCurrentUser) {
            console.log("don't speek");
            $('<div class="message message-personal">' + data.msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
        } else {
            console.log("speek");
            synthVoice(data.msg);
            $('<div class="message new"><figure class="avatar"><span>' + data.user + '</span></figure>' + data.msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
            // $('<div class="message new"><figure class="avatar"><span><i class="fa fa-android"></i></span></figure>' + data.msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
        }
        updateScrollbar();
        // $chat.append('<div class="well"><strong>' + data.user + '</strong> : ' + data.msg + '</div>');
    });

    socket.on("get users", function(data) {
        var html = '';
        for (i = 0; i < data.length; i++) {
            html += '<li><i class=" fa-li fa fa-user-circle fa-2x"></i>' + data[i] + '</li>';
        }
        $users.html(html);
    });
});