import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import { drawHand } from "./utilities";
import * as fp from "fingerpose";
import victory from "../../assets/emojis/victory.png";
import thumbs_up from "../../assets/emojis/thumbs_up.png";
import okGestureImage from "../../assets/emojis/ok.png";
import rockGestureImage from "../../assets/emojis/rock.png";

const Detection = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectionStatus, setDetectionStatus] = useState("Not Detected");
  const [accuracy, setAccuracy] = useState("N/A");
  const [emoji, setEmoji] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const image = {
    thumbs_up: thumbs_up,
    victory: victory,
    ok_gesture: okGestureImage,
    rock_gesture: rockGestureImage,
  };

  // Define gestures
  const createGestures = () => {
    // OK Gesture
    const OKGesture = new fp.GestureDescription("ok_gesture");
    OKGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
    OKGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
    OKGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpRight, 0.75);
    OKGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, 0.75);
    [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach((finger) => {
      OKGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    });

    // Rock Gesture
    const RockGesture = new fp.GestureDescription("rock_gesture");
    RockGesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
    RockGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
    [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Thumb].forEach((finger) => {
      RockGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    });

    return [OKGesture, RockGesture];
  };

  const runHandpose = async () => {
    const net = await handpose.load();
    console.log("Handpose model loaded.");
    setIsModelLoaded(true);

    const gestures = createGestures();
    const gestureEstimator = new fp.GestureEstimator([
      fp.Gestures.VictoryGesture,
      fp.Gestures.ThumbsUpGesture,
      ...gestures,
    ]);

    setInterval(() => {
      detect(net, gestureEstimator);
    }, 100);
  };

  const detect = async (net, gestureEstimator) => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
  
      const canvas = canvasRef.current;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
  
      const hands = await net.estimateHands(video);
  
      if (hands.length > 0) {
        setDetectionStatus("Detected");
        const gesture = await gestureEstimator.estimate(hands[0].landmarks, 7.5);
  
        if (gesture.gestures !== undefined && gesture.gestures.length > 0) {
          const { name, score } = gesture.gestures[0]; // Safe destructuring
          const maxConfidenceGesture = gesture.gestures.reduce((prev, current) =>
            prev.confidence > current.confidence ? prev : current
          );
  
          setEmoji(maxConfidenceGesture.name);
          setAccuracy(`${(score * 10).toFixed(2) - 10.57} %`);
        }
      } else {
        setDetectionStatus("Not Detected");
        setAccuracy("N/A");
        setEmoji(null);
      }
  
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawHand(hands, ctx);
    }
  };

  useEffect(() => {
    runHandpose();
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-[35rem] bg-gray-100 relative">
      {!isModelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
          <p className="text-white text-lg font-bold">Model is loading...</p>
        </div>
      )}

      <header className="relative flex justify-center items-center w-full h-[30rem]">
        <Webcam
          ref={webcamRef}
          className="absolute w-full h-full max-w-[30rem] object-cover z-10 rounded-lg shadow-lg"
        />
        <canvas
          ref={canvasRef}
          className="absolute w-full max-w-[30rem] h-full z-20"
        />
        {emoji && (
          <img
            src={image[emoji]}
            alt="gesture emoji"
            className="absolute top-4 right-4 w-16 h-16 z-30"
          />
        )}
      </header>

      <div className="flex flex-col items-center gap-2 mb-4 z-30">
        <p className="text-lg font-bold">{emoji}</p>
        <p className="text-center text-gray-800">
          Results: <span className="text-green-500">{detectionStatus}</span> | Accuracy:{" "}
          <span className="text-blue-500">{accuracy}</span>
        </p>
      </div>
    </div>
  );
};

export default Detection;
