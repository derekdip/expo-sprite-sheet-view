import { useEffect, useRef, useState} from "react";
import { View, Text, Image } from "react-native";
import { Asset } from "expo-asset";
import { ExpoSpriteSheetView, ExpoSpriteSheetViewHandle } from "expo-sprite-sheet-view";

type AnimState = "idle" | "walk" | "work";

type AnimConfig = {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
};

const ANIMS: Record<AnimState, AnimConfig> = {
  idle: { row: 0, frames: 8, fps: 6, loop: true },
  walk: { row: 13, frames: 8, fps: 10, loop: true },
  work: { row: 17, frames: 4, fps: 12, loop: true },
};
type AnimEvent = {
  atMs: number;
  state: AnimState;
  playing?: boolean;
};

const DEMO_EVENTS: AnimEvent[] = [
  { atMs: 0,    state: "idle", playing: true },
  { atMs: 1800,  state: "walk" },
  { atMs: 2600, state: "work" },
  { atMs: 3400, state: "walk" },
  { atMs: 5200, state: "idle" },
];


function cfgForState(state: AnimState): AnimConfig {
  return ANIMS[state];
}
// with ref hook control
export function SpriteSheetRefExample({ uri }: { uri: string }) {
  // Imperative handle to the native view (we'll call setNativeProps)

  // Input refs (updated frequently by your real input/network code)
  const movingRef = useRef(false);
  const workingRef = useRef(false);

  // Current animation state refs (no React re-render needed)
  const desiredAnimRef = useRef<AnimState>("idle");
  const appliedAnimRef = useRef<AnimState>("idle");
  const viewRef = useRef<ExpoSpriteSheetViewHandle>(null);


  // ---- 1) Feed dummy input events into refs (simulates joystick/network) ----
  useEffect(() => {
    const timers = DEMO_EVENTS.map((ev) =>
      setTimeout(() => {
        if (viewRef.current) {
          if (ev.state === "walk") movingRef.current = ev.state === "walk";
          if (ev.state === "work") workingRef.current = ev.state === "work";
        }
      }, ev.atMs)
    );

    // loop the demo every ~4.2s
    const totalMs = Math.max(...DEMO_EVENTS.map((e) => e.atMs)) + 800;
    const loopTimer = setInterval(() => {
      movingRef.current = false;
      workingRef.current = false;
    }, totalMs);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loopTimer);
    };
  }, []);

  // ---- 2) Animation decision loop (runs at low Hz, doesn’t re-render) ----
  useEffect(() => {
    const decide = () => {
      if (viewRef.current) {
      // Priority: work > walk > idle (simple state machine)
      let next: AnimState = "idle";
      if (workingRef.current) next = "work";
      else if (movingRef.current) next = "walk";
      else next = "idle";

      desiredAnimRef.current = next;
      }
    };

    const id = setInterval(decide, 50); // 20Hz decision loop
    return () => clearInterval(id);
  }, []);

  // ---- 3) Commit loop (only pushes props when state actually changes) ----
  useEffect(() => {
    const commit = () => {
      
      const desired = desiredAnimRef.current;
      const applied = appliedAnimRef.current;

      if (desired !== applied) {
        appliedAnimRef.current = desired;
        const cfg = cfgForState(desired);

        viewRef.current?.setProps({
          row: 13,
          frames: 8,
          fps: 10,
          playing: true,
          loop: true,
        });

      }
    };

    const id = setInterval(commit, 80); // ~12.5Hz commit loop
    return () => clearInterval(id);
  }, []);

  // Initial props (render once)
  const initial = ANIMS.idle;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>

      <ExpoSpriteSheetView
        ref={viewRef}
        style={{ width: 32 * 4, height: 32 * 4 }}
        sourceUri={uri}
        frameW={32}
        frameH={32}
        row={initial.row}
        frames={initial.frames}
        fps={initial.fps}
        playing={true}
        loop={initial.loop}
      />
    </View>
  );
}


// useState hook control
export default function App() {
  const asset = Asset.fromModule(require("./assets/char.png"));
  const [localUri, setLocalUri] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      if (!asset.localUri) {
        await asset.downloadAsync();
        setLocalUri(asset.localUri);
        console.log("Downloaded asset, uri:", asset.uri);
        console.log("Asset details:", { uri: asset.uri, width: asset.width ?? undefined, height: asset.height ?? undefined })
      }
    }
    load();
  }, []);


  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#222",
        alignItems: "center",
        justifyContent: "center",
      }}>
      {localUri &&
      <>
        <View style={{ alignItems: "center", backgroundColor:'#773300', justifyContent: "center", marginBottom: 20 }} >
            <Text style={{ color: "white", marginBottom: 10 }}>
              Original Sprite Sheet
            </Text>
            <Image source ={ require("./assets/char.png")} />
        </View>
        <View style={{ alignItems: "center", backgroundColor:'#773300', justifyContent: "center", marginBottom: 20 }} >
            <Text style={{ color: "white", marginBottom: 10,  }}>
              Stretched Sprite Sheet
            </Text>
            <Image source ={ require("./assets/char.png")} style= {{height: 32 * 4, resizeMode:'cover'}} />
        </View>

        <View style={{ alignItems: "center", backgroundColor:'#773300', justifyContent: "center", marginBottom: 20 }} >
          <Text style={{ color: "white", marginBottom: 10 }}>
            Regular Implementation
          </Text>
          <ExpoSpriteSheetView 
            sourceUri={localUri} 
            style={{ width: 32 * 4, height: 32 * 4 }}
            frameW={32}
            frameH={32}
            row={13}
            frames={8}
            fps={10}
            playing={true}
            loop={true}/>
         </View>
         <View style={{ alignItems: "center", backgroundColor:'#225500', justifyContent: "center", marginBottom: 20 }} >
            <Text style={{ color: "white", marginBottom: 10 }}>
              With Ref Control
            </Text>
            <SpriteSheetRefExample uri={localUri}/>
          </View>
        </>
      }
    </View>
  );
}
