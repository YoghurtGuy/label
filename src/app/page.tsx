import Rank from "@/app/_components/Rank";

export default async function Home() {
  return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)'}}>
        <div className="w-1/3">
          <Rank/>
        </div>
        {/* <div className="w-2/3">
        </div> */}
      </div>
  );
}
