//SubgoalCard.jsx
const SubgoalCard = ({ subgoal, tasks, selectedTaskId, setSelectedTaskId, getProgress, getStatusIcon }) => (
  <div className="card">
    <img src="/slice.png" alt="Subgoal" />
    <h3>{subgoal?.title || 'No Subgoal'}</h3>
    <p>📊 Progress: {getProgress(subgoal?.tasks || [])}%</p>
    <ul>
      {tasks.map(task => (
        <li
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
          className={task.id === selectedTaskId ? 'selected' : ''}
        >
          {getStatusIcon(task.status)} {task.title}
        </li>
      ))}
    </ul>
  </div>
);

export default SubgoalCard;