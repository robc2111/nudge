//EditGoal.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EditGoal = () => {
  const { id } = useParams();
  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGoal = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGoal(data);
    };

    fetchGoal();
  }, [id]);

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/goals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: goal.title,
        description: goal.description,
        due_date: goal.due_date
      })
    });

    if (res.ok) {
      navigate('/dashboard');
    } else {
      const err = await res.json();
      setError(err.error || 'Update failed');
    }
  };

  if (!goal) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Edit Goal</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <input
        type="text"
        className="w-full border p-2 mb-2 rounded"
        value={goal.title}
        onChange={(e) => setGoal({ ...goal, title: e.target.value })}
      />
      <textarea
        className="w-full border p-2 mb-2 rounded"
        value={goal.description || ''}
        onChange={(e) => setGoal({ ...goal, description: e.target.value })}
      />
      <input
        type="date"
        className="w-full border p-2 mb-4 rounded"
        value={goal.due_date || ''}
        onChange={(e) => setGoal({ ...goal, due_date: e.target.value })}
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleUpdate}
      >
        Save Changes
      </button>
    </div>
  );
};

export default EditGoal;