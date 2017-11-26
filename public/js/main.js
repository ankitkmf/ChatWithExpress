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

    $("#messageArea").on("click", "li.cursor", function() {
        console.log($(this).data("id"));
        console.log($(this).data("name"));
        $(".chat").show();
        $("#refUser").text($(this).data("name"));
        $("#refUser").attr("data-id", $(this).data("id"));

        var data = {
            currentUser: $("#loginUser").data("id"),
            refUser: $(this).data("id")
        }

        $.ajax({
                method: "Post",
                url: "/data/getchat",
                data: { user: data }
            })
            .done(function(data) {
                if (data != null && data.length > 0) {
                    $('.mCSB_container').html('');
                    $.each(data, function(index, value) {
                        writeChat(value, false);
                    });
                }
            })
            .fail(function() {
                console.log("Error in chat result:");
            })
            .always(function() {});
    });
    $("#chatMessage").mCustomScrollbar({
        theme: "dark-3"
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    $("#btnSpeech").on('click', () => {
        $("#btnSpeech").addClass("speech");
        recognition.start();
    });

    recognition.addEventListener('result', (e) => {
        let last = e.results.length - 1;
        let text = e.results[last][0].transcript;
        var data = {
            text: text,
            currentUser: $("#loginUser").text(),
            currentUserID: $("#loginUser").data("id"),
            refUser: $("#refUser").text(),
            refUserID: $("#refUser").data("id")
        };
        socket.emit("send message", data);
    });

    recognition.addEventListener('speechend', () => {
        recognition.stop();
    });

    recognition.addEventListener('error', (e) => {
        $("#btnSpeech").removeClass("speech");
    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        // recognition.start();
        socket.emit("send message", $message.val());
        $message.val('');
    });

    $userForm.submit(function(e) {
        e.preventDefault();
        socket.emit("new user", $username.val(), function(data) {

            if (data.isvalid) {

                $("#loginUser").text(data.username);
                $("#loginUser").attr("data-id", data.userID);
                $userFormArea.hide();
                $messageArea.show();
                $(".welcome").show();
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
        writeChat(data, true);
        // $chat.append('<div class="well"><strong>' + data.user + '</strong> : ' + data.msg + '</div>');
    });

    var writeChat = (data, speak) => {

        $("#btnSpeech").removeClass("speech");
        var IsCurrentUser = data.user == $("#loginUser").text() ? true : false;
        if (IsCurrentUser) {
            console.log("don't speek");
            $('<div class="message message-personal">' + data.text + '</div>').appendTo($('.mCSB_container')).addClass('new');
        } else {
            console.log("speek");
            if (speak)
                synthVoice(data.text);
            $('<div class="message new"><figure class="avatar"><span>' + data.user + '</span></figure>' + data.text + '</div>').appendTo($('.mCSB_container')).addClass('new');
            // $('<div class="message new"><figure class="avatar"><span><i class="fa fa-android"></i></span></figure>' + data.msg + '</div>').appendTo($('.mCSB_container')).addClass('new');
        }
        updateScrollbar();

    };

    socket.on("get users", function(data) {
        var html = '';

        data = data.filter(function(user) {
            return user.username != $("#loginUser").text();
        });

        if (data.length > 0) {
            for (i = 0; i < data.length; i++) {
                html += '<li class="cursor" data-id=' + data[i].userID + ' data-name=' + data[i].username +
                    '><i class=" fa-li fa fa-user-circle fa-2x"></i>' +
                    data[i].username + '</li>';
            }

            $users.html(html);
        } else
            $users.html('<li class="noCursor" > No one is online </li>');
    });
});