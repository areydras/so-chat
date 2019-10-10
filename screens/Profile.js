import React, { Component } from 'react';
import { SafeAreaView, Image, TouchableOpacity, StyleSheet, PermissionsAndroid, View, Text, TextInput, Dimensions } from 'react-native';
import firebase from 'firebase'
import ImagePicker from 'react-native-image-picker';
import RNFetchBlob from 'rn-fetch-blob';

const { width } = Dimensions.get('window')

class Profile extends Component {
    state = { 
        user : {
            uid: null,
            email: null,
            name: null
        }
     }

    componentDidMount = async() => {
        await this.getUser()
    }

    componentWillUnmount = async() => {
        await this.getUser()
    }

    requestCameraPermission = async () => {
        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.CAMERA,
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            ]);
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.log(err);
            return false;
        }
    };

    changeImage = async() => {
        const Blob = RNFetchBlob.polyfill.Blob;
        const fs = RNFetchBlob.fs;
        const user = firebase.auth().currentUser

        window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest;
        window.Blob = Blob;

        const options = {
            title: 'Select Profile',
            storageOptions: {
                skipBackup: true,
                path: 'images',
            },
            mediaType: 'photo',
        };

        let cameraPermission =
            (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)) &&
            PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            ) &&
            PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            );
        if (!cameraPermission) {
            cameraPermission = await this.requestCameraPermission();
        } else {
            ImagePicker.showImagePicker(options, response => {
                let uploadBob = null;
                const imageRef = firebase.storage().ref('images/' + user.uid)
                    fs.readFile(response.path, 'base64')
                    .then(data => {
                        return Blob.build(data, { type: `${response.mime};BASE64` });
                    })
                    .then(blob => {
                        uploadBob = blob;
                        return imageRef.put(blob, { contentType: `${response.mime}` });
                    })
                    .then(() => {
                        uploadBob.close();
                        return imageRef.getDownloadURL();
                    })
                    .then(url => {
                        firebase.database().ref('users/' + user.uid).once('value', val => {
                            let users = val.val()[Object.keys(val.val())]
                            let updateUser = {
                                                user: {
                                                    ...users,
                                                    photo: url
                                                }
                                            }
                            firebase.database().ref('users/' + user.uid).update(updateUser);
                        })
                    })
                    .catch(err => console.log(err));
            });
        }
    };

    getUser = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                firebase.database().ref('users/' + user.uid).once('value').then(res => {
                    let key = Object.keys(res.val())
                    let data = res.val()
                    let dataUser = {
                        ...data[key],
                        email: user.email,
                    }
                    this.setState({ user: dataUser })
                })
            }
        })
    }

    handleSignOut = () => {
        firebase.auth().signOut().then(() => {
            this.props.navigation.navigate('AuthStack')
        })

        let user = firebase.auth().currentUser
        let updates = {}

        firebase.database().ref('users/' + user.uid).once('value', val => {
            let users = val.val()[Object.keys(val.val())]
            let updateStatus = {
                user: {
                    ...users,
                    status: firebase.database.ServerValue.TIMESTAMP
                }
            }

            updates['users/' + users.uid] = updateStatus
        })
        
        firebase.database().ref().update(updates)
    }

    render() { 
        if(this.state.user.uid !== null) {
            const { uid, email, name, phone, status, photo } = this.state.user
            return (
                <SafeAreaView style={styles.container}>
                    <TouchableOpacity onPress={this.changeImage}>
                        <View style={styles.imageProfile}>
                            <Image source={{ uri: (photo) ? photo : 'https://imgur.com/CJfr5uM' }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                            <Image source={require('../assets/icons/photo_camera.png')} style={{ height: 20, width: 20, position: 'absolute', bottom: 5, left: 50 }} />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.containerNameStatus}>
                        <TextInput style={styles.name} value={(uid) ? name : null} />
                        <TextInput style={styles.status} value={(uid) ? status : null} placeholder='Add status' />
                    </View>
                    <View style={styles.dataContainer}>
                        <TextInput style={styles.data} value={(uid) ? email : null} />
                        <TextInput style={styles.data} value={(uid) ? phone : null} placeholder='Phone number' />
                        <TextInput style={styles.data} placeholder='Type here for change password' />
                    </View>
                    <TouchableOpacity onPress={this.handleSignOut}>
                        <View style={styles.button}>
                            <Text style={styles.buttonText}>Logout</Text>
                        </View>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }else{
            return(
                <Text>Loading.....</Text>
            )
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    imageProfile: {
        height: width / 3,
        width: width / 3,
        borderRadius: width / 3,
        alignSelf: 'center',
        marginTop: width / 10,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'white'
    },
    containerNameStatus: {
    },
    name: {
        marginTop: 10,
        paddingVertical: 5,
        fontSize: 25,
        textAlign: 'center',
        marginHorizontal: width / 15
    },
    status: {
        paddingVertical: 1,
        marginTop: -10,
        textAlign: 'center',
        marginHorizontal: width / 15
    },
    dataContainer: {
        marginTop: width / 15,
        marginHorizontal: width / 10
    },
    data: {
        marginTop: 10,
        fontSize: 18,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#2FAEB2'
    },
    button: {
        width: 150,
        backgroundColor: '#DC0808',
        borderRadius: 25,
        alignSelf: 'center',
        marginTop: width / 10
    },
    buttonText: {
        paddingVertical: 15,
        textAlign: 'center',
        color: 'white',
        fontSize: 18
    }
});

export default Profile;
