import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

export default function ConsentPopup() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setShow(!localStorage.getItem('consent'));
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      padding: '20px',
      borderTop: '1px solid #ccc',
      zIndex: 1000,
      textAlign: 'center'
    }}>
      <p>This site logs anonymous interactions for research purposes. Do you agree?</p>
      <button
        style={{marginRight: '10px', padding: '5px 15px'}}
        onClick={() => {
          localStorage.setItem('consent', 'true');
          setShow(false);
        }}
      >
        Agree
      </button>
      <button
        style={{padding: '5px 15px'}}
        onClick={() => navigate('/exit')}
      >
        Disagree
      </button>
    </div>
  );
}
