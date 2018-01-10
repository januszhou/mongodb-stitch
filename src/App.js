import React, { Component } from 'react';
import { StitchClient } from 'mongodb-stitch';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {fromJS} from 'immutable';
import {DateRangePicker} from "react-dates";
import * as moment from 'moment';

class LoginForm extends Component {
  state = {
    email: null,
    password: null
  };

  onChange = (e) => {
    this.setState({[e.target.name]: e.target.value});
  };
  render(){
    return (
      <form>
        <div className="form-group">
          <label>Email address</label>
          <input type="email" className="form-control" aria-describedby="emailHelp" placeholder="Enter email" name="email" onChange={this.onChange}/>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" className="form-control" placeholder="Password" name="password" onChange={this.onChange}/>
        </div>
        <button type="submit" className="btn btn-primary" onClick={(e) => {e.preventDefault();this.props.onSubmit({email: this.state.email, password: this.state.password})}}>Submit</button>
      </form>
    )
  }
}
class ChartFooter extends Component {
  state = {
    currentTime: moment()
  };

  componentDidMount(){
    setInterval(() => {
      this.setState({currentTime: moment()});
    }, 1000);
  }

  render(){
    return (
      this.props.lastUpdate && <div className="card-footer">
        <small className="text-muted">Last updated: {this.props.lastUpdate.from(this.state.currentTime)}</small>
      </div>
    )
  }
}

const ChartHeader = (props) => {
  return (
    <div className="card-header">
      <div className="d-flex">
        <div className="mr-auto p-2">
          <h4>{props.name}</h4>
        </div>
        {
          props.includeDatePicker && (
            <DateRangePicker
              startDate={props.startDate} // momentPropTypes.momentObj or null,
              endDate={props.endDate} // momentPropTypes.momentObj or null,
              onDatesChange={({ startDate, endDate }) => props.setDate({ startDate, endDate })}
              onFocusChange={focusedInput => props.setDate({ focusedInput })}
            />
          )
        }
        <div className="p-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={(e) => {
            e.preventDefault();
            props.onRefresh();
          }}>
            <i className="fa fa-refresh" aria-hidden="true"/>
          </button>
        </div>
      </div>
    </div>
  );
};
const Chart = (props) => {
  const data = props.data;
  let content = (
    <div className="card-body">
      <i className="fa fa-spinner fa-spin fa-3x fa-fw"/>
      <span className="sr-only">Loading...</span>
    </div>
  );
  if(data){
    const jsData = data.toJS();
    content = (
      <div>
        <div className="card-body">
          <ResponsiveContainer minHeight={320}>
            <BarChart data={[jsData]}>
              <XAxis dataKey="name"/>
              <YAxis domain={[dataMin => 0, dataMax => Math.round(dataMax * 1.2)]}/>
              <CartesianGrid strokeDasharray="3 3"/>
              <Tooltip/>
              <Legend />
              <Bar dataKey="goldmine" fill="#ffd200"/>
              <Bar dataKey="palladium" fill="#7761a7"/>

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }
  return content;
};

class App extends Component {
  constructor(props){
    super(props);
    this.stitchClient = null;
    this.db = null;
    this.state = {
      data: fromJS({
        authedId: null,
        dailyNotification: {
          lastUpdate: null,
          data: null
        },
        dailySubscriber: {
          lastUpdate: null,
          data: null
        },
        totalNotification: {
          lastUpdate: null,
          data: null,
          start: null,
          end: null
        },
        totalSubscriber: {
          lastUpdate: null,
          data: null,
          start: null,
          end: null
        }
      })
    };
    this.onSubmit = this.onSubmit.bind(this);
    this.loadDailyNotification = this.loadDailyNotification.bind(this);
    this.loadDailySubscriber = this.loadDailySubscriber.bind(this);
  }

  async login({email, password}){
    try {
      return await this.stitchClient.login(email, password);
    } catch(e){
      console.log('error: ', e);
      return null;
    }
  }

  async loadDailyNotification(){
    const pushCollection = this.db.collection('push');
    pushCollection.aggregate([
      {$match:
        {
          "createdAt": {
            $lt: new Date(),
            $gte: new Date(new Date().setDate(new Date().getDate()-1))
          }
        }
      },
      {$group: { _id: '$app', total: { $sum: 1 } }},
    ]).then(res => {
      const dbData = res.reduce((accu, current) => { accu[current._id] = current.total; return accu;}, {name: 'Daily Notification'});
      this.setState(({data}) => ({
        data: data.set('dailyNotification',fromJS({
          data: dbData,
          lastUpdate: moment()
        }))
      }));
    }).catch(e =>
      console.log(e)
    )
  }

  async loadDailySubscriber(){
    const subscriberCollection = this.db.collection('subscribers');
    subscriberCollection.aggregate([
      {$unwind: "$subscriptions" },
      {$match:
        {
          "subscriptions.createdAt": {
            $lt: new Date(),
            $gte: new Date(new Date().setDate(new Date().getDate()-1))
          }
        }
      },
      {$group: { _id: '$subscriptions.app', total: { $sum: 1 } }},
    ]).then(res => {
      const dbData = res.reduce((accu, current) => { accu[current._id] = current.total; return accu;}, {name: 'Daily Subscriber'});
      this.setState(({data}) => ({
        data: data.set('dailySubscriber',fromJS({
          data: dbData,
          lastUpdate: moment()
        }))
      }));
    }).catch(e =>
      console.log(e)
    )
  }

  async initialLoading(client){
    const authedId = client.authedId();
    this.setState(({data}) => ({
      data: data.set('authedId',authedId)
    }));
    this.loadDailySubscriber();
    this.loadDailyNotification();
  }

  onSubmit({email, password}){
    this.login({email, password})
      .then(loginRes => {
        if(loginRes){
          this.initialLoading(this.stitchClient);
        } else {
          alert('Invalid Credential, try again please');
        }
      });
  }

  componentDidMount(){
    this.stitchClient = new StitchClient('ktp-notification-dashboard-uedhe');
    this.db = this.stitchClient.service('mongodb', 'mongodb-atlas').db('palladium_notification_prod');
    const authedId = this.stitchClient.authedId();
    if(authedId){
      this.initialLoading(this.stitchClient)
    }
  }
  render() {
    const Charts = (
      <div className="card-deck">
        <div className="card">
          <ChartHeader
            name="Daily Notification"
            onRefresh={this.loadDailyNotification}
          />
          <Chart
            data={this.state.data.getIn(['dailyNotification', 'data'])}
          />
          <ChartFooter
            lastUpdate={this.state.data.getIn(['dailyNotification', 'lastUpdate'])}
            currentTime={this.state.data.get('currentTime')}
          />
        </div>

        <div className="card">
          <ChartHeader
            name="Daily Subscriber"
            onRefresh={this.loadDailyNotification}
          />
          <Chart
            data={this.state.data.getIn(['dailySubscriber', 'data'])}
          />
          <ChartFooter
            lastUpdate={this.state.data.getIn(['dailySubscriber', 'lastUpdate'])}
          />
        </div>
      </div>
    );
    const mainContent = this.state.data.get('authedId', null) ? Charts: <LoginForm onSubmit={this.onSubmit}/>;
    return (
      <div className="fluid-container">
        <nav className="navbar navbar-light bg-light">
          <a className="navbar-brand" href="#">
            KTP Notification Dashboard
          </a>
        </nav>
        { mainContent }
      </div>
    );
  }
}

export default App;
