import React, { Component } from 'react';
import { StitchClient } from 'mongodb-stitch';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {fromJS} from 'immutable';
import {DateRangePicker , isInclusivelyBeforeDay} from "react-dates";
import * as moment from 'moment';

class DateRangePickerWrapper extends Component {
  state = {
    focusedInput: null
  };

  setFocus = (focusedInput) => {
    this.setState({ focusedInput });
  };

  render() {
    return(
      <DateRangePicker
        onFocusChange={focusedInput => this.setFocus(focusedInput)}
        focusedInput={this.state.focusedInput}
        isOutsideRange={day => !isInclusivelyBeforeDay(day, moment())}
        numberOfMonths={3}
        {...this.props}
      />
    );
  }
}

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
            <div className="p-2">
              <DateRangePickerWrapper
                startDate={props.startDate} // momentPropTypes.momentObj or null,
                endDate={props.endDate} // momentPropTypes.momentObj or null,
                onDatesChange={({ startDate, endDate }) => props.setDate({ startDate, endDate })}
                withPortal={true}
              />
            </div>
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
            <BarChart data={jsData}>
              <XAxis dataKey="date"/>
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
          data: null,
          start: null,
          end: null
        },
        dailySubscriber: {
          lastUpdate: null,
          data: null,
          start: null,
          end: null
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

  async loadDailyNotification({ start, end, key } = { start: moment(), end: moment(), key: 'dailyNotification' }){
    const pushCollection = this.db.collection('push');
    pushCollection.aggregate([
      {$match:
        {
          "createdAt": {
            $lt: end.endOf('day').toDate(),
            $gte: start.startOf('day').toDate(),
          }
        }
      },
      {$group: { _id: { month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" }, year: { $year: "$createdAt" }, app: "$app" }, total: { $sum: 1 } }},
    ]).then(res => {
      console.log(res);
      let formatResult = res.map(i => ({
        date: `${i._id.month}/${i._id.day}/${i._id.year}`,
        app: i._id.app,
        total: i.total
      })).reduce((accum, curr) => {
        if(!accum[curr.date]) accum[curr.date] = {date: curr.date};
        accum[curr.date][curr.app] = curr.total;
        return accum;
      }, {});
      formatResult = Object.values(formatResult);
      formatResult.sort((a,b) => moment(a.date) > moment(b.date) ? 1 : -1);
      this.setState(({data}) => ({
        data: data.set(key,fromJS({
          data: formatResult,
          lastUpdate: moment(),
          start,
          end,
        }))
      }));
    }).catch(e =>
      console.log(e)
    )
  }

  async loadDailySubscriber({ start, end, key } = { start: moment(), end: moment(), key: 'dailySubscriber' }){
    const subscriberCollection = this.db.collection('subscribers');
    subscriberCollection.aggregate([
      {$unwind: "$subscriptions" },
      {$match:
        {
          "subscriptions.createdAt": {
            $lt: end.endOf('day').toDate(),
            $gte: start.startOf('day').toDate(),
          }
        }
      },
      {$group: { _id: { month: { $month: "$subscriptions.createdAt" }, day: { $dayOfMonth: "$subscriptions.createdAt" }, year: { $year: "$subscriptions.createdAt" }, app: "$subscriptions.app" }, total: { $sum: 1 } }},
    ]).then(res => {
      let formatResult = res.map(i => ({
        date: `${i._id.month}/${i._id.day}/${i._id.year}`,
        app: i._id.app,
        total: i.total
      })).reduce((accum, curr) => {
        if(!accum[curr.date]) accum[curr.date] = {date: curr.date};
        accum[curr.date][curr.app] = curr.total;
        return accum;
      }, {});
      formatResult = Object.values(formatResult);
      formatResult.sort((a,b) => moment(a.date) > moment(b.date) ? 1 : -1);
      this.setState(({data}) => ({
        data: data.set(key,fromJS({
          data: formatResult,
          lastUpdate: moment(),
          start,
          end
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
    this.loadDailySubscriber({ start: moment().subtract(7, 'day'), end: moment().subtract(1, 'day'), key:'totalSubscriber' });
    this.loadDailyNotification({ start: moment().subtract(7, 'day'), end: moment().subtract(1, 'day'), key:'totalNotification' });
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
      <div>
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
            />
          </div>

          <div className="card">
            <ChartHeader
              name="Daily Subscriber"
              onRefresh={this.loadDailySubscriber}
            />
            <Chart
              data={this.state.data.getIn(['dailySubscriber', 'data'])}
            />
            <ChartFooter
              lastUpdate={this.state.data.getIn(['dailySubscriber', 'lastUpdate'])}
            />
          </div>
        </div>
        <div className="card-deck">
          <div className="card">
            <ChartHeader
              name="Total Notification"
              onRefresh={() => this.loadDailyNotification({start: this.state.data.getIn(['totalNotification', 'start']), end: this.state.data.getIn(['totalNotification', 'end']), key: 'totalNotification'})}
              includeDatePicker={true}
              setDate={({startDate, endDate}) => {
                this.setState(({data}) => ({
                  data: data.setIn(['totalNotification', 'start'],startDate).setIn(['totalNotification', 'end'],endDate)
                }));
              }}
              startDate={this.state.data.getIn(['totalNotification', 'start'])}
              endDate={this.state.data.getIn(['totalNotification', 'end'])}
            />
            <Chart
              data={this.state.data.getIn(['totalNotification', 'data'])}
            />
            <ChartFooter
              lastUpdate={this.state.data.getIn(['totalNotification', 'lastUpdate'])}
            />
          </div>

          <div className="card">
            <ChartHeader
              name="Total Subscriber"
              onRefresh={() => this.loadDailySubscriber({start: this.state.data.getIn(['totalSubscriber', 'start']), end: this.state.data.getIn(['totalSubscriber', 'end']), key: 'totalSubscriber'})}
              includeDatePicker={true}
              setDate={({startDate, endDate}) => {
                this.setState(({data}) => ({
                  data: data.setIn(['totalSubscriber', 'start'],startDate).setIn(['totalSubscriber', 'end'],endDate)
                }));
              }}
              startDate={this.state.data.getIn(['totalSubscriber', 'start'])}
              endDate={this.state.data.getIn(['totalSubscriber', 'end'])}
            />
            <Chart
              data={this.state.data.getIn(['totalSubscriber', 'data'])}
            />
            <ChartFooter
              lastUpdate={this.state.data.getIn(['totalSubscriber', 'lastUpdate'])}
            />
          </div>
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
