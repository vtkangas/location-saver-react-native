import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Appbar, List, Button, Text, Dialog, Portal, Provider, TextInput } from 'react-native-paper';
import * as SQLite from 'expo-sqlite';
import * as Location from 'expo-location';
import { LocationObject, PermissionResponse } from 'expo-location';

interface LocationData {
  id : number;
  name : string;
  description : string;
  latitude : number;
  longitude : number;
  date : number;
}

interface Coordinates {
  lat : number;
  long : number;
}

interface DialogData {
  visible : boolean;
  name : string;
  description : string;
}

const db : SQLite.WebSQLDatabase = SQLite.openDatabase("locations.db");

db.transaction(
  (tx : SQLite.SQLTransaction) => {
    // tx.executeSql(`DROP TABLE locations`); 
    tx.executeSql(`CREATE TABLE IF NOT EXISTS locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    description TEXT,
                    latitude FLOAT,
                    longitude FLOAT,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  )`);  
  }, 
  (err : SQLite.SQLError) => { 
    console.log(err) 
  }
);

const App : React.FC = () : React.ReactElement => {

  const [dialog, setDialog] = useState<DialogData>({visible:false, name: "", description: ""});
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinates>();

  const [error, setError] = useState<String>("");
  const [info, setInfo] = useState<String>("");

  //for coordinates
  const getCoordinates = async () : Promise<void> => {

    try {
      setInfo("Pyydetään lupaa sijaintitietoihin...")

      const locationPermission : PermissionResponse = await Location.requestForegroundPermissionsAsync();

      if (locationPermission.status !== 'granted') {
        setInfo("");
        setError("Ei lupaa sijaintitietoihin");
      } else {
        setError("");
        setInfo("Haetaan sijaintitietoja");
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoordinates({lat : location.coords.latitude, long : location.coords.longitude});
      setDialog({...dialog, visible : true});
      setInfo("")

    } catch (error: any) {
      setError(error.message);
    }

  }
  
  //db functions
  const addLocation = () : void => {

    if(coordinates && dialog.name){
      db.transaction(
        (tx : SQLite.SQLTransaction) => {
          tx.executeSql(`INSERT INTO locations (name, description, latitude, longitude) VALUES (?, ?, ?, ?)`, 
          [dialog.name, dialog.description, coordinates.lat, coordinates.long], 
            (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
              getLocations();
            });
        }, 
        (err: SQLite.SQLError) => console.log(err));

      setDialog({...dialog, visible : false, name : "", description : ""});

      } else {
        alert("Sijaintitiedot tai nimi puuttuvat...");
      }
  }

  const deleteLocation = (id : number) : void => {

    db.transaction(
      (tx : SQLite.SQLTransaction) => {
        tx.executeSql(`DELETE FROM locations WHERE id = ?`, [id], 
          (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
            getLocations();
          });
      }, 
      (err: SQLite.SQLError) => console.log(err));

  }

  const getLocations = () : void => {

    db.transaction(
      (tx : SQLite.SQLTransaction) => {
        tx.executeSql(`SELECT * FROM locations`, [], 
          (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
            setLocations(rs.rows._array);
          });
      }, 
      (err: SQLite.SQLError) => console.log(err));

  }

  useEffect(() => {

    getLocations();

  }, []);

  return (
    <Provider>
    <Appbar.Header>
      <Appbar.Content title="Sijaintimuistio"/>
    </Appbar.Header>
    <ScrollView style={{padding : 20}}>

      
    <List.AccordionGroup>
      {(locations.length > 0)
        ? locations.map((location: LocationData, idx: number) => {
            return (  
              <List.Accordion 
                title={location.name}
                id={idx.toString()}
                key={`name${idx}`}
                >
                <List.Item title={`Kuvaus: `} description={location.description} key={`desc${idx}`}/>
                <List.Item title={`Koordinaatit: `} description={`${location.latitude}, ${location.longitude}`} key={`coords${idx}`}/>
                <List.Item title={`Päiväys: `} description={location.date} key={`date${idx}`}/>
                <Button icon="delete" mode="outlined" style={{'margin': 10}} onPress={() => deleteLocation(location.id)}>Poista</Button>
              </List.Accordion>
            )  
        })
        : <Text>Ei sijainteja</Text>
      }
    </List.AccordionGroup>

      {(Boolean(error))
          ? <Text style={styles.error}>{error}</Text>
          : null
      }

      {(Boolean(info))
          ? <><ActivityIndicator size='small'/><Text style={styles.info}>{info}</Text></>
          : <Button
              style={{ marginTop : 20 }}
              mode="contained"
              icon="plus"
              onPress={getCoordinates}
            >Lisää uusi sijainti</Button>
      }
  
        <Portal>
          <Dialog
            visible={dialog.visible}
            onDismiss={() => setDialog({...dialog, visible : false})}
          >
            <Dialog.Title>Lisää uusi sijainti</Dialog.Title>
            <Dialog.Content>
              <TextInput 
                label="Nimi"
                mode="outlined"
                placeholder='Nimeä sijainti...'
                onChangeText={ (newName : string) => setDialog({...dialog, name: newName})}
              />
              <TextInput 
                label="Kuvaus"
                mode="outlined"
                placeholder='Lisää kuvaus...'
                onChangeText={ (newDesc : string) => setDialog({...dialog, description: newDesc})}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={addLocation}>Lisää listaan</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      <StatusBar style="auto" />
    </ScrollView>
  </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center'
  },
  info: {
    textAlign: 'center'
  }
});

export default App;