import Navbar from "../components/Navbar";
import Button from "../components/Button";

const Home = () => {
  return (
    <div>
      <Navbar />
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to SaaS App</h1>
        <p className="mb-4">This is your SaaS application built with ShadCN.</p>
        <Button onClick={() => alert("Button clicked!")}>Get Started</Button>
      </main>
    </div>
  );
};

export default Home;
