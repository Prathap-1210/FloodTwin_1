import {
  useEffect,
  useState,
} from "react";

import {
  Clock3,
} from "lucide-react";


function DigitalClock() {
  const [
    now,
    setNow,
  ] = useState(
    new Date(),
  );

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNow(
            new Date(),
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);


  const time =
    now.toLocaleTimeString(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          true,

        timeZone:
          "Asia/Kolkata",
      },
    );


  const date =
    now.toLocaleDateString(
      "en-IN",
      {
        weekday:
          "short",

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        timeZone:
          "Asia/Kolkata",
      },
    );


  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-[#007cf7]/15
        bg-[#007cf7]/[0.06]
        px-4
        py-2.5
        backdrop-blur-xl
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          bg-[#007cf7]/15
          text-[#4da3ff]
        "
      >
        <Clock3
          size={17}
        />
      </div>

      <div>
        <div
          className="
            font-mono
            text-base
            font-semibold
            tracking-[0.12em]
            text-[#8cc7ff]
          "
        >
          {time}
        </div>

        <div
          className="
            mt-0.5
            flex
            items-center
            gap-2
            text-[9px]
            uppercase
            tracking-[0.13em]
            text-slate-500
          "
        >
          <span>
            {date}
          </span>

          <span
            className="
              text-[#4da3ff]
            "
          >
            IST
          </span>
        </div>
      </div>
    </div>
  );
}


export default DigitalClock;