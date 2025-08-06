//SubgoalCard.jsx
const getStatusClass = (status) => {
  switch (status) {
    case 'done':
      return 'bg-green-700 text-white';
    case 'in_progress':
      return 'bg-green-100 text-green-900';
    default:
      return '';
  }
};

const SubgoalCard = ({ subgoal, tasks, selectedTaskId, setSelectedTaskId, getProgress, getStatusIcon }) => (
    
  <div className="card">
    <img src="/slice.png" alt="Subgoal" />
    <h3 className={`font-semibold px-2 py-1 rounded ${getStatusClass(subgoal.status)}`}>
  {subgoal?.title || 'No Subgoal'}
</h3>
    <p>📊 Progress: {getProgress(subgoal?.tasks || [])}%</p>
    <ul>
      {tasks.map(task => (
        <li
  key={task.id}
  onClick={() => setSelectedTaskId(task.id)}
  className={`cursor-pointer ${
    task.status === 'done' ? 'status-done' :
    task.status === 'in_progress' ? 'status-in-progress' : ''
  } ${task.id === selectedTaskId ? 'selected' : ''}`}
>
  {getStatusIcon(task.status)} {task.title}
</li>
      ))}
    </ul>
  </div>
);

export default SubgoalCard;