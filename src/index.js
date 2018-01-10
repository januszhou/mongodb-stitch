import 'react-dates/initialize';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import 'react-dates/lib/css/_datepicker.css';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
