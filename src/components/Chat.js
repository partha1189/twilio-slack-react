import { useHistory } from "react-router-dom";
import axios from "axios";
import ChatItem from "./ChatItem";
import React, { useRef } from "react";
import { useEffect, useState } from "react";
const ChatAPI = require("twilio-chat");

function Chat() {
  const email = localStorage.getItem("email");
  const room = window.location.pathname.split("/")[1];

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState(null);
  const [text, setText] = useState("");
  // const [link, setLink] = useState(null);

  // const messages = []

  const roomsList = ["general"];
  let scrollDiv = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(async () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    console.log(scrollDiv);
    let token = "";

    if (!email) {
      history.push("/");
    }

    setLoading(true);

    try {
      token = await getToken(email);
      //   console.log(token)
    } catch {
      throw new Error("Unable to get token, please reload this page");
    }

    const client = await ChatAPI.Client.create(token);

    client.on("tokenAboutToExpire", async () => {
      const token = await getToken(email);
      client.updateToken(token);
    });

    client.on("tokenExpired", async () => {
      const token = await getToken(email);
      client.updateToken(token);
    });

    client.on("channelJoined", async (channel) => {
      // getting list of all messages since this is an existing channel
      const newMessages = await channel.getMessages();

      newMessages.items.map((message) => {
        const txt = message.state.body;
        if (txt.includes("http")) {
          console.log("INCLUDES http");
          message.link = txt;
        }
        return message;
      });
      console.log("AFTER join messages:", newMessages.items);
      // messages.push(newMessages.items || [])
      setMessages(newMessages.items || []);
      // scrollToBottom();
    });

    try {
      const channel = await client.getChannelByUniqueName(room);
      console.log(channel);
      joinChannel(channel);
      setChannel(channel);
    } catch (err) {
      try {
        const channel = await client.createChannel({
          uniqueName: room,
          friendlyName: room,
        });

        joinChannel(channel);
        //   console.log("channel:"+channel)
      } catch {
        throw new Error("Unable to create channel, please reload this page");
      }
    }
  }, [email, room]);

  const updateText = (e) => setText(e);

  const joinChannel = async (channel) => {
    if (channel.channelState.status !== "joined") {
      await channel.join();
    }

    setChannel(channel);
    setLoading(false);

    channel.on("messageAdded", function (message) {
      handleMessageAdded(message);
    });
    //    scrollToBottom();
  };

  let history = useHistory();

  const changeRoom = (room) => {
    history.push(room);
  };

  const getToken = async (email) => {
    const response = await axios.get(`https://twilio-slack123.herokuapp.com/token/${email}`);
    const { data } = response;
    return data.token;
  };

  const handleMessageAdded = async (message) => {
    // setMessages((messages) => [...messages, message]);
    // messages.push(message)
    console.log(message);
    console.log("messages:", messages);
    ///////////////////////////////////
    const txt = message.state.body;
    if (txt.includes("http")) {
      console.log("INCLUDES http");
      message.link = txt;
    }

    setMessages((messages) => [...messages, message]);
    //////////////////////////////////
    scrollToBottom();
  };

  const scrollToBottom = () => {
    const scrollHeight = scrollDiv.current.scrollHeight;
    const height = scrollDiv.current.clientHeight;
    const maxScrollTop = scrollHeight - height;
    scrollDiv.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
  };

  const sendMessage = async () => {
    if (text) {
      console.log(String(text).trim());
      setLoading(true);
      channel.sendMessage(String(text).trim());
     ///////////////
      console.log("INCLUDES LISTEN", text);
      if (text.includes("listen")) {
        const arr = text.split(" ");
        arr.shift();
        console.log(arr);
        //const response = await axios.get(`search?term=${arr.join("+")}`);
        const response = await axios.get(
          `https://itunes.apple.com/search?term=${arr.join("+")}`,
          {
            headers: {
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Headers":
                 "Origin, X-Requested-With, Content-Type, Accept",
              // "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
               "Content-type": "application/x-www-form-urlencoded",
            },
          }
        );
        const { data } = response;
        console.log("APPLE DATA:", data.results[0]);
        // setLink(data.results[0].trackViewUrl);
        //message.link = data.results[0].trackViewUrl;
        //message.state.link = data.results[0].trackViewUrl;
        channel.sendMessage(String(data.results[0].trackViewUrl).trim());

        const json = JSON.stringify({
          text: String(data.results[0].trackViewUrl),
          unfurl_links: true,
          unfurls: {
            "https://example.com": {
              preview: {
                title: {
                  type: "plain_text",
                  text: "custom preview",
                },
                icon_url: data.results[0].artworkUrl100,
              },
            },
          },
        });
        const slackResponse = await axios.post(
          `https://hooks.sla`+`ck.com/services/T02RWFFHQTY/B02S986J33M/jIlDfJ`+`T4IENJMVh3zKMIlHr5`,
          json,
          {
            headers: {
              // "Access-Control-Allow-Origin": "*",
              // "Access-Control-Allow-Headers":
              //   "Origin, X-Requested-With, Content-Type, Accept",
              // "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
              "Content-type": "application/x-www-form-urlencoded",
            },
          }
        );
        console.log("SLACK", slackResponse);
      }
      ////////////

      setText("");
      setLoading(false);
    }
  };

  return (
    <div className="chatScreen">
      <div className="sidebar">
        <h4>{email}</h4>
        <h2>Rooms</h2>
        {roomsList.map((room) => (
          <p key={room} onClick={() => changeRoom(room)}>
            {room}
          </p>
        ))}
      </div>

      <div className="chatContainer" ref={scrollDiv}>
        <div className="chatHeader">
          {room === "chat" ? "Choose A Room" : room}
        </div>

        <div className="chatContents">
          {messages &&
            room !== "chat" &&
            messages.map((message) => (
              <>
                <ChatItem
                  key={message.index}
                  message={message}
                  email={email}
                  link={message.link}
                />
              </>
            ))}
        </div>

        {room !== "chat" && (
          <div className="chatFooter">
            <input
              type="text"
              placeholder="Type Message"
              onChange={(e) => updateText(e.target.value)}
              value={text}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
