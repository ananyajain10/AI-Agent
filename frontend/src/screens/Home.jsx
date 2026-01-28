import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/user.context";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [project, setProject] = useState([]);

  const navigate = useNavigate();

  const logout = async () => {
    try {
      await axios.post("/users/logout");
    } catch (err) {
      console.log("Logout request failed (safe to ignore)");
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      navigate("/login");
    }
  };

  function createProject(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    axios
      .post(
        "/projects/create",
        { name: projectName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        setIsModalOpen(false);
        setProjectName("");
      })
      .catch(console.log);
  }

  useEffect(() => {
    axios
      .get("/projects/all")
      .then((res) => setProject(res.data.projects))
      .catch(console.log);
  }, [isModalOpen]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome, <span className="text-blue-600">{user?.email}</span>
          </h1>
          <p className="text-sm text-slate-500">
            Manage and collaborate on your projects
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition"
        >
          Logout
        </button>
      </header>

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
        >
          + New Project
        </button>
      </div>

      {/* Projects Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {project.map((project) => (
          <div
            key={project._id}
            onClick={() =>
              navigate(`/project`, {
                state: { project },
              })
            }
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              {project.name}
            </h2>

            <div className="text-sm text-slate-500 flex items-center gap-2">
              <i className="ri-user-line text-base"></i>
              <span>{project.users.length} collaborators</span>
            </div>
          </div>
        ))}
      </section>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Create New Project
            </h2>

            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Project Name
                </label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  type="text"
                  placeholder="e.g. AI Dashboard"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
