import React, { Component } from 'react';
import { StitchClient } from 'mongodb-stitch';
import {Area, AreaChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";

const data = [
  {name: 'Page A', uv: 4000, pv: 2400, amt: 2400},
  {name: 'Page B', uv: 3000, pv: 1398, amt: 2210},
  {name: 'Page C', uv: 2000, pv: 9800, amt: 2290},
  {name: 'Page D', uv: 2780, pv: 3908, amt: 2000},
  {name: 'Page E', uv: 1890, pv: 4800, amt: 2181},
  {name: 'Page F', uv: 2390, pv: 3800, amt: 2500},
  {name: 'Page G', uv: 3490, pv: 4300, amt: 2100},
];
class App extends Component {
  constructor(props){
    super(props);
    this.appId = 'ktp-notification-dashboard-uedhe';
    this.stitchClient = null;
    this.db = null;
    this.state = {
      data: null
    }
  }

  componentDidMount(){
    this.stitchClient = new StitchClient(this.appId);
    this.stitchClient.login()
      .then(() => console.log('logged in as: ' + this.stitchClient.authedId()))
      .catch(e => console.log('error: ', e));

    const db = this.stitchClient.service('mongodb', 'mongodb-atlas').db('palladium_notification_prod');
    const subscriberCollection = db.collection('subscribers');
    subscriberCollection.find({}).limit(5).execute().then((doc) => console.log(doc));
  }
  render() {
    return (
      <div className="fluid-container">
        <nav className="navbar navbar-light bg-light">
          <a className="navbar-brand" href="#">
            KTP Notification Dashboard
          </a>
        </nav>
        <div className="card-deck">
          <div className="card">
            <div className="card-header">Header</div>
            <div className="card-body">
              <LineChart width={500} height={300} data={data} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <CartesianGrid strokeDasharray="3 3"/>
                <Tooltip/>
                <Legend />
                <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{r: 8}}/>
                <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
              </LineChart>
            </div>
            <div className="card-footer">
              <small className="text-muted">Last updated 3 mins ago</small>
            </div>
          </div>
          <div className="card">
            <div className="card-header">Header</div>
            <div className="card-body">
              <LineChart width={500} height={300} data={data} margin={{top: 5, left: 20, bottom: 5}}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <CartesianGrid strokeDasharray="3 3"/>
                <Tooltip/>
                <Legend />
                <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{r: 8}}/>
                <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
              </LineChart>
            </div>
            <div className="card-footer">
              <small className="text-muted">Last updated 3 mins ago</small>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

export default App;
