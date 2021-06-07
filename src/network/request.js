import axios from "axios"
import { Message } from 'element-ui';

let pending = []; //声明一个数组用于存储每个请求的取消函数和axios标识
let cancelToken = axios.CancelToken;
let removePending = (config) => {
  for (let p in pending) {
    const curURL = config.url.split('/')[1] + '&' + config.method
    console.log(curURL);
    if (pending[p].u === curURL) {
      // 当前请求在数组中存在时执行函数体
      if (curURL === 'sys-parameters&get') return
      pending[p].f(); //执行取消操作
      pending.splice(p, 1); //数组移除当前请求
    }
  }
}
// token过期处理
function toKenExpiredHandle() {
  localStorage.removeItem('uid')
  localStorage.removeItem('toKen')
  location.replace('/#/passport/login')
  Message(
    {
      message: '请重新登录',
      type: 'warning'
    }
  )
}
export function request(config, method) {
  const instance = axios.create({
    baseURL: "/api",
    timeout: 5000,
    method: method,
  })

  instance.interceptors.request.use(config => {
    const toKen = localStorage.getItem('toKen')
    // console.log(config);
    removePending(config); //在一个axios发送前执行一下取消操作
    config.cancelToken = new cancelToken((c) => {
      // pending存放每一次请求的标识，一般是url + 参数名 + 请求方法，当然你可以自己定义
      // 取出最前端的url路径,并加上其对应方法
      const url = config.url.split('/')[1]
      pending.push({ u: url + '&' + config.method, f: c });//config.data为请求参数
      // console.log('pending', pending);
    });
    //添加headrs toKen
    if (toKen) {
      config.headers.Authorization = 'Bearer ' + toKen
      // console.log(config);
    }
    return config
  }, err => {
    console.log(`request interceptors error: ${err}`);
    return Promise.reject(err)
  })

  instance.interceptors.response.use(response => {
    // console.log(response.data);
    return response.data
  }, err => {
    console.error(err);
    if (err.response != undefined) {
      switch (err.response.status) {
        case 400:
          console.log('Bad Request');
          return err.response.data;
        case 401:
          console.log('Unauthorized');
          break;
        case 403:
          console.log('Forbidden');
          //进行token过期处理
          toKenExpiredHandle();
          break;
        case 500:
          console.log('Internal Server Error');
          break;
        default:
          console.log(err);
          break;
      }
    }
    return err.response ? Promise.reject(err.response.data) : Promise.reject('请求返回时发生了错误');
    // return Promise.reject(err.response.data);
  })


  return instance(config)
}