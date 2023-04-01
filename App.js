import React, { useState, useEffect } from 'react'
import { Text, View, TextInput, Button, Dimensions, ScrollView } from 'react-native'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import DropDownPicker from 'react-native-dropdown-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {API_TOKEN} from "react-native-dotenv"
import { LineChart } from "react-native-chart-kit"

export default function App() {
  const API_URL = "https://api.apilayer.com/exchangerates_data/"
  const [amt1, setAmt1] = useState(1)
  const [amt2, setAmt2] = useState(null)
  const [cur1, setCur1] = useState('INR')
  const [cur2, setCur2] = useState('USD')
  const [open1, setOpen1] = useState(false)
  const [open2, setOpen2] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [converting, setConverting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [oldRates, setOldRates] = useState({})
  const [graphData, setGraphData] = useState({})
  const MAX_FAV_LEN = 5

  useEffect(()=>{
    const getData = async()=>{
      try {
        let headers = new Headers()
        headers.append("apikey", API_TOKEN)

        let requestOptions = {
          method: 'GET',
          redirect: 'follow',
          headers: headers
        }
        const raw = await fetch(`${API_URL}symbols`, requestOptions)
        if(raw.status!==200){
          throw Error("Couldn't fetch symbols")
        }
        
        const res = await raw.json()
        if(!res.success) throw Error("Couldn't fetch symbols")

        let curList = [], symstr = ""
        for (let k in res.symbols) {
          curList.push({label: res.symbols[k], value: k})
          symstr += k+'%2c'
        }

        const raw2 = await fetch(`${API_URL}latest?symbols=${symstr}&base=USD`, requestOptions)

        if(!raw2 || raw2.status!==200){
          throw Error("Couldn't fetch rates")
        }

        const res2 = await raw2.json()
        if(!res.success) throw Error("Couldn't fetch rates")
        else setOldRates(res2)

        let jsonValue = JSON.stringify(res2)
        await AsyncStorage.setItem('Rates', jsonValue)

        jsonValue = JSON.stringify(curList)
        await AsyncStorage.setItem('List', jsonValue)
        setItems(curList)
        console.log("Success")
      } catch (error) {
        console.log(error)
        let jsonValue = await AsyncStorage.getItem('List')

        if(!jsonValue){
          console.log("No offline symbols available")
        }
        else setItems(JSON.parse(jsonValue))

        jsonValue = await AsyncStorage.getItem('Rates')
        if(!jsonValue){
          console.log("No offline rates available")
        }
        else setOldRates(JSON.parse(jsonValue))
      }
      setLoading(false)
    }

    getData()

    const getFavorites = async () => {
      let jsonValue = await AsyncStorage.getItem('Favorites')
      if(!jsonValue) return
      setFavorites(JSON.parse(jsonValue))
    }
    getFavorites()

    const getHistory = async () => {
      let jsonValue = await AsyncStorage.getItem('History')
      if(!jsonValue) return
      setHistory(JSON.parse(jsonValue))
    }
    getHistory()
  }, [])

  const onCur1Open = ()=>{
    setOpen2(false)
  }
  const onCur2Open = ()=>{
    setOpen1(false)
  }
  const favorite = async()=>{
    if(items.length===0){
      return
    }

    setAdding(true)
    const temp = favorites
    for(let x of temp){
      if(x.cur1===cur1 && x.cur2===cur2){ /* Repeated pair */
        setAdding(false)
        return
      }
    }
    temp.push({cur1, cur2})
    if(temp.length>MAX_FAV_LEN){
      temp.shift()
    }
    let jsonValue = JSON.stringify(temp)
    await AsyncStorage.setItem('Favorites', jsonValue)
    setFavorites(temp)
    setAdding(false)
  }
  const convert = async()=>{
    if(!oldRates.rates){
      return
    }
    setConverting(true)

    const temp = history
    let found = false
    for(let x of temp){
      if(x.cur1===cur1 && x.cur2===cur2){ /* Repeated pair */
        found = true
        break
      }
    }

    if(!found){
      temp.push({cur1, cur2})
      if(temp.length>MAX_FAV_LEN){
        temp.shift()
      }
      let jsonValue = JSON.stringify(temp)
      await AsyncStorage.setItem('History', jsonValue)
      setHistory(temp)
    }

    let res = amt1*(oldRates.rates[cur2]/oldRates.rates[cur1])
    setAmt2(res.toFixed(8))
    setConverting(false)
  }
  const generateGraph = async()=>{
    setGenerating(true)
    try {
      let headers = new Headers()
      headers.append("apikey", API_TOKEN)
      let requestOptions = {
        method: 'GET',
        redirect: 'follow',
        headers: headers
      }
      let end_date = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10)
      let start_date = new Date(new Date().setDate(new Date().getDate() - 21)).toISOString().slice(0, 10)

      const raw = await fetch(`https://api.apilayer.com/exchangerates_data/timeseries?start_date=${start_date}&end_date=${end_date}&base=${cur1}&symbols=${cur2}`, requestOptions)

      if(!raw || raw.status!==200){
        console.log(raw)
        throw Error("Couldn't fetch timeseries")
      }
      
      const res = await raw.json()
      if(!res.success) throw Error("Couldn't fetch timeseries")
      const temp_labels = []
      const temp_data = []

      for(let x in res.rates){
        temp_labels.push(x.slice(8))
        temp_data.push(res.rates[x][cur2])
      }

      setGraphData({labels: temp_labels, data: temp_data})
    } catch (error) {
      console.log(error)
    }
    setGenerating(false)
  }

  const usePair = async(c1, c2)=>{
    setCur1(c1)
    setCur2(c2)
  }


  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex items-start justify-start bg-black">
        <ScrollView className="w-full">
          <View className="w-full mt-3">
            <Text className="text-slate-300 text-3xl font-semibold">Currency Converter</Text>
            {oldRates.date ? <Text className="text-slate-300 text-lg font-semibold">(last updated: {oldRates.date})</Text>
            : <Text className="text-slate-300 text-lg font-semibold">(conversion rates unavailable)</Text>}
          </View>
          <View className="w-full mb-2">
            <Text className="text-slate-300 text-2xl font-medium">Amount</Text>
            <TextInput className="text-slate-300 font-bold border rounded-lg border-slate-300 px-2 h-12" value={`${amt1}`} inputMode="numeric" onChangeText={setAmt1} placeholder="Enter amount 1" onEndEditing={convert}/>
          </View>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-slate-300 text-2xl font-medium">From</Text>
              <DropDownPicker
                loading={loading}
                open={open1}
                value={cur1}
                items={items}
                setOpen={setOpen1}
                onOpen={onCur1Open}
                setValue={setCur1}
                theme="DARK"
                className="border border-slate-300 bg-black w-fit"
                textStyle={{
                  color: 'white'
                }}
                modalContentContainerStyle={{
                  backgroundColor: "black"
                }}
                searchable={true}
                listMode="MODAL"
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-300 text-2xl font-medium">To</Text>
              <DropDownPicker
                loading={loading}
                open={open2}
                value={cur2}
                items={items}
                setOpen={setOpen2}
                onOpen={onCur2Open}
                setValue={setCur2}
                theme="DARK"
                className="border border-slate-300 bg-black w-fit"
                textStyle={{
                  color: 'white'
                }}
                searchable={true}
                listMode="MODAL"
                modalContentContainerStyle={{
                  backgroundColor: "black"
                }}
              />
            </View>
          </View>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 border border-white rounded-lg h-12 flex justify-center">
              <Button disabled={adding} onPress={favorite} title="Add to favorites"/>
            </View>
            <View className="flex-1 border border-white rounded-lg h-12 flex justify-center">
              <Button disabled={generating} onPress={generateGraph} title={generating ? "Generating" : "Get Rate Chart"}/>
            </View>
          </View>
          <View className="mb-3 border w-full border-white rounded-lg h-12 flex justify-center">
            <Button disabled={converting} onPress={convert} title={converting ? "Converting..." : "Convert"}/>
          </View>
          {amt2===null ? <></> : <View className="w-full">
            <Text className="text-slate-300 text-2xl font-medium">Result</Text>
            <TextInput className="text-slate-300 font-bold border rounded-lg border-slate-300 px-2 h-12" value={`${amt2}`} editable={false}/>
          </View>}
          {favorites.length===0 ? <></> : <View className="w-full my-2">
            <Text className="text-slate-300 text-2xl font-medium">Favorites</Text>
            <Text className="text-slate-300 text-lg font-semibold">(atmost {MAX_FAV_LEN})</Text>
            {favorites.map((e, i)=>{
              return <View className="flex-row w-full gap-2 items-center" key={i}> 
                <Text className="flex-1 text-slate-300 text-lg font-medium">{i+1+'. '+e.cur1+' to '+e.cur2}</Text>
                <View className="">
                  <Button disabled={false} onPress={()=>usePair(e.cur1, e.cur2)} title="Use"/>
                </View>
              </View>
            })}
          </View>}
          {history.length===0 ? <></> : <View className="w-full my-2">
            <Text className="text-slate-300 text-2xl font-medium">History</Text>
            <Text className="text-slate-300 text-lg font-semibold">(last {MAX_FAV_LEN})</Text>
            {history.map((e, i)=>{
              return <View className="flex-row w-full gap-2 items-center" key={i}> 
                <Text className="flex-1 text-slate-300 text-lg font-medium">{i+1+'. '+e.cur1+' to '+e.cur2}</Text>
                <View className="">
                  <Button disabled={false} onPress={()=>usePair(e.cur1, e.cur2)} title="Use"/>
                </View>
              </View>
            })}
          </View>}
          {!graphData.labels? <></> : <View>
            <Text className="text-slate-300 text-2xl font-medium">Rate Chart</Text>
            <Text className="text-slate-300 text-lg font-semibold">(1{cur1} v/s {cur2})(14 days before 1 week)</Text>
            <LineChart
              data={{
                labels: graphData.labels,
                datasets: [
                  {
                    data: graphData.data
                  }
                ]
              }}
              width={Dimensions.get("window").width - 14}
              height={220}
              yAxisLabel=""
              yAxisSuffix={cur2}
              chartConfig={{
                backgroundColor: "black",
                backgroundGradientFrom: "black",
                backgroundGradientTo: "black",
                decimalPlaces: 2, // optional, defaults to 2dp
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 0
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "white"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 4
              }}
            />
          </View>}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}