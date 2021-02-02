import moment from 'moment'
import React, { Component } from 'react';
import { SafeAreaView, FlatList, Image, TouchableOpacity, StyleSheet, View, Text, TextInput, Dimensions } from 'react-native';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

const { width } = Dimensions.get('window')

class Chat extends Component {
    state = { 
        text : '',
        myUid : '',
        status: null,
        messages : [],
        user: null,
        initializing: true,
    }

    componentDidMount = () => {
        this.getUser();
    }

    componentWillUnmount = () => {
        this.getUser();
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (!this.state.initializing && this.state.user) {
            this.getMessage();
            this.getStatus();
        }
    }

    getUser = () => {
        auth().onAuthStateChanged(this.onAuthStateChanged);
    }

    onAuthStateChanged = (user) => {
        if (this.state.initializing) {
            this.setState({initializing: false});
        }

        this.setState({user});
    }

    getMessage = () => {
        const { uid } = this.props.route.params.item;

        database().ref('messages/').child(this.state.user.uid).child(uid).on('child_added', newMessage => {
            this.setState(prevState => {
                return {
                    messages: [...prevState.messages.reverse(), newMessage.val()].reverse()
                }
            })
        })
    }

    handleSendMessage = () => {
        const updates = {}
        const { text, user } = this.state
        const { uid }  = this.props.route.params.item

        if(text.length){
            let messageId = database().ref('messages').child(user.uid).child(uid).push().key
    
            let message = {
                message: text,
                time: database.ServerValue.TIMESTAMP,
                from: user.uid
            }
    
            updates['messages/' + user.uid + '/' + uid + '/' + messageId] = message
            updates['messages/' + uid + '/' + user.uid + '/' + messageId] = message
    
            database().ref().update(updates)
            this.setState({ text: '' })
        }
    }

    convertTime = time => {
        let record = new Date(time);
        let current = new Date();
        let result = (record.getHours() < 10 ? '0' : '') + record.getHours() + ':';
        result += (record.getMinutes() < 10 ? '0' : '') + record.getMinutes();
    
        if (current.getDay() !== record.getDay()) {
            result = moment(time).format('ddd') + '  ' + result
        }
    
        return result;
    };

    convertTimeStatus = time => {
        return moment(time).calendar()
    };

    renderMessage = data => {
        return(
            (data.item.from !== this.state.user?.uid) ?
                <View style={styles.messageFriendContainer}>
                    <Text style={ styles.messageFriend }>{data.item.message} </Text>
                    <Text style={ styles.messageFriendTime }>{this.convertTime(data.item.time)}</Text>
                </View>
            :
                <View style={styles.messageUserContainer}>
                    <Text style={ styles.messageUser }>{data.item.message} </Text>
                    <Text style={ styles.messageUserTime }>{this.convertTime(data.item.time)}</Text>
                </View>
        )
    }

    getStatus = () => {
        const { uid } = this.props.route.params.item
        database().ref('users/' + uid).on('child_changed', user => {
            if (user)
                this.setState({ status: user.val() })
        })
    }

     render() { 
        const { name, photo } = this.props.route.params.item
        const status = (this.state.status === null) ? this.props.route.params.item.status : this.state.status.status

        return (
                 <SafeAreaView style={styles.container}>
                     <View style={styles.header}>
                         <TouchableOpacity onPress={() => this.props.navigation.goBack()}>
                             <Image source={require('../assets/icons/arrow_back.png')} style={styles.arrowBack} />
                         </TouchableOpacity>
                         <View style={styles.containerImage}>
                            <Image source={{ uri: (photo) ? photo : 'https://imgur.com/CJfr5uM.png' }} style={ styles.image } />
                         </View>
                         <View style={styles.headerNameContainer}>
                             <Text style={styles.headerName}>{(name.length > 25) ? name.substr(0, 25) + '...' : name}</Text>
                             <Text>{(status === 'online') ? 'Online' : this.convertTimeStatus(status)}</Text>
                         </View>
                     </View>
                     <View style={styles.messageContainer}>
                         <FlatList
                             keyExtractor={data => data.time.toString()}
                             data={this.state.messages}
                             renderItem={this.renderMessage}
                             contentContainerStyle={styles.messageLists}
                             showsVerticalScrollIndicator={false}
                             ref="flatList"
                             inverted
                         />
                     </View>
                     <View style={styles.textInputContainer}>
                         <TextInput placeholder='Tell me. U love me' style={styles.textInput} 
                                    onChangeText={text => this.setState({ text })} value={this.state.text} 
                                    returnKeyType='send' onSubmitEditing={this.handleSendMessage}
                                    />
                         <TouchableOpacity onPress={this.handleSendMessage} style={styles.send}>
                             <Image source={require('../assets/icons/send.png')} />
                         </TouchableOpacity>
                     </View>                 
                 </SafeAreaView>                 
         );
    }
}
 
const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        flexDirection: 'row',
        height: width / 5.5,
        backgroundColor: '#2FAEB2',
        alignItems: 'center',
    },
    arrowBack: {
        height: 20,
        width: 20,
        marginLeft: 10,
    },
    containerImage: {
        width: 55,
        height: 55,
        borderRadius: 55,
        marginHorizontal: 15,
        overflow: 'hidden',
        backgroundColor: 'white',
    },
    image: {
        width: '100%', 
        height: '100%', 
        resizeMode: 'cover'
    },
    headerNameContainer: {
        marginLeft: 5,
        width: '55%'
    },
    headerName: {
        fontSize: 20,
    },
    more: {
        marginLeft: 10,
        width: 25,
        height: 25
    },
    messageContainer: {
        flex: 1,
        marginHorizontal: 10
    },
    messageLists: {
        flexGrow: 1
    },
    messageUserContainer: {
        backgroundColor: '#E5E5E5', 
        paddingVertical: 5, 
        paddingHorizontal: 40, 
        marginVertical: 5,
        color: 'black',
        alignSelf: 'flex-end',
        borderRadius: 25
    },
    messageUser: {
        marginLeft: -25
    },
    messageUserTime: {
        fontSize: 10, 
        marginTop: -3, 
        marginRight: -25, 
        textAlign: 'right'
    },
    messageFriendContainer: {
        backgroundColor: '#2FAEB2',
        paddingVertical: 5,
        paddingHorizontal: 40,
        marginVertical: 5,
        color: 'white',
        alignSelf: 'flex-start',
        borderRadius: 25
    },
    messageFriend: {
        color: 'white', 
        marginLeft: -25
    },
    messageFriendTime: {
        fontSize: 10, 
        marginTop: -3, 
        marginRight: -25, 
        textAlign: 'right', 
        color: 'white' 
    },
    textInputContainer: {
        borderWidth: 1,
        borderRadius: 25,
        borderColor: '#E3E3E3',
        color: '#E3E3E3',
        marginBottom: 10,
        marginHorizontal: width / 20,
        position: 'relative'
    },
    textInput: {
        paddingLeft: 20,
        width: '85%'
    },
    send: {
        position: 'absolute',
        marginTop: 5,
        alignSelf: 'flex-end',
        right: 10
    }
});

export default Chat;
